using AutoMapper;
using FluentValidation;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Application.DTOs.User;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Security.Cryptography;
using System.Text;
using EYExpenseManager.Core.Entities;
using Microsoft.AspNetCore.Http;
using System.IO;
using EYExpenseManager.Application.Services.Email;
using Microsoft.Extensions.Options;
using System.Web;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EYExpenseManager.Core.Configuration; // Add this import
using EYExpenseManager.Application.Helpers;


namespace EYExpenseManager.Application.Services.User
{
    public interface IUserService
    {
        Task<UserResponseDto> CreateUserAsync(UserCreateDto userDto);
        Task<UserResponseDto> UpdateUserAsync(UserUpdateDto userDto);
        Task<UserResponseDto> AuthenticateAsync(UserLoginDto loginDto);
        Task<UserResponseDto> GetByIdAsync(int id);
        Task<UserResponseDto> GetByEmailAsync(string email);
        Task<IEnumerable<UserResponseDto>> GetAllUsersAsync();
        Task<IEnumerable<UserResponseDto>> GetUsersByRoleAsync(Role role);
        Task DeleteUserAsync(int id);
        Task<byte[]> GetProfileImageAsync(int userId);

        // New methods for email verification workflow
        Task<bool> VerifyUserAccountAsync(UserVerificationDto verificationDto);
        Task<bool> RequestPasswordResetAsync(string email);
        Task<bool> ResetPasswordAsync(PasswordResetDto resetDto);
        Task<UserResponseDto> AuthenticateWithGoogleAsync(GoogleAuthDto googleAuth);
        Task<IEnumerable<UserResponseDto>> GetPendingVerificationsAsync();
    }

    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly IValidator<UserCreateDto> _createValidator;
        private readonly IValidator<UserUpdateDto> _updateValidator;
        private readonly IEmailService _emailService;
        private readonly string _profileImagesFolder;
        private readonly string _jwtSecret;
        private readonly string _baseUrl;
        private readonly EmailServiceConfiguration _emailConfig;

        public UserService(
            IUserRepository userRepository,
            IMapper mapper,
            IValidator<UserCreateDto> createValidator,
            IValidator<UserUpdateDto> updateValidator,
            IEmailService emailService,
            IOptions<EmailServiceConfiguration> emailConfig,
            IOptions<AuthenticationSettings> authSettings)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _emailService = emailService;
            _emailConfig = emailConfig.Value;
            _jwtSecret = authSettings.Value.JwtSecret;
            _baseUrl = emailConfig.Value.BaseUrl;

            // Create directory for profile images
            _profileImagesFolder = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "Uploads", "ProfileImages");
            if (!Directory.Exists(_profileImagesFolder))
            {
                Directory.CreateDirectory(_profileImagesFolder);
            }
        }

        public async Task<UserResponseDto> CreateUserAsync(UserCreateDto userDto)
        {
            // Normalize email
            userDto.Email = userDto.Email.Trim().ToLower();

            // Validate input
            var validationResult = await _createValidator.ValidateAsync(userDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            // Email uniqueness check (already normalized)
            var existingEmailUser = await _userRepository.GetByEmailAsync(userDto.Email);
            if (existingEmailUser != null)
                throw new InvalidOperationException("Email déjà utilisé");

            var existingIdUser = await _userRepository.GetByIdUserAsync(userDto.IdUser);
            if (existingIdUser != null)
                throw new InvalidOperationException("ID utilisateur déjà existant");

            // Generate a random password for first login
            var tempPassword = GenerateRandomPassword();
            var hashedPassword = PasswordHelper.HashPassword(tempPassword);

            // Map DTO to entity
            var user = _mapper.Map<UserCreateDto, EYExpenseManager.Core.Entities.User>(userDto);
            user.Enabled = false;
            user.EmailVerified = false;
            user.IsFirstLogin = true;
            user.Password = hashedPassword;
            user.Role = (Role)userDto.Role;
            user.VerificationToken = GenerateToken();
            user.VerificationTokenExpiry = DateTime.UtcNow.AddDays(2);

            // Handle profile image upload
            if (userDto.ProfileImage != null && userDto.ProfileImage.Length > 0)
            {
                var fileName = $"{Guid.NewGuid()}_{userDto.ProfileImage.FileName}";
                var filePath = Path.Combine(_profileImagesFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await userDto.ProfileImage.CopyToAsync(stream);
                }

                user.ProfileImagePath = filePath;
                user.ProfileImageFileName = fileName;
                user.ProfileImageContentType = userDto.ProfileImage.ContentType;
            }

            var createdUser = await _userRepository.AddAsync(user);

            // Send verification email to admin
            await SendVerificationEmailToAdmins(createdUser);

            var userResponse = _mapper.Map<UserResponseDto>(createdUser);

            if (!string.IsNullOrEmpty(createdUser.ProfileImageFileName))
                userResponse.ProfileImageUrl = $"/api/user/{createdUser.Id}/profile-image";

            return userResponse;
        }

        public async Task<UserResponseDto> UpdateUserAsync(UserUpdateDto userDto)
        {
            // Validate input
            var validationResult = await _updateValidator.ValidateAsync(userDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var existingUser = await _userRepository.GetByIdAsync(userDto.Id);
            if (existingUser == null)
                throw new InvalidOperationException("User not found");

            // Check for email uniqueness if email is being changed
            if (userDto.Email != null && userDto.Email.Trim().ToLower() != existingUser.Email)
            {
                var normalizedEmail = userDto.Email.Trim().ToLower();
                var emailUser = await _userRepository.GetByEmailAsync(normalizedEmail);
                if (emailUser != null) throw new InvalidOperationException("Email already registered");
                userDto.Email = normalizedEmail; // Normalize for storage
            }

            // Check for IdUser uniqueness if changing
            if (userDto.IdUser != null && userDto.IdUser != existingUser.IdUser)
            {
                var idUser = await _userRepository.GetByIdUserAsync(userDto.IdUser);
                if (idUser != null) throw new InvalidOperationException("User ID already exists");
            }

            // Explicitly update fields
            existingUser.NameUser = userDto.NameUser ?? existingUser.NameUser;
            existingUser.Surname = userDto.Surname ?? existingUser.Surname;
            existingUser.Email = userDto.Email ?? existingUser.Email;
            existingUser.Role = userDto.Role ?? existingUser.Role;
            existingUser.Gpn = userDto.Gpn ?? existingUser.Gpn;

            if (!string.IsNullOrEmpty(userDto.Password))
                existingUser.Password = PasswordHelper.HashPassword(userDto.Password);

            // Handle profile image update
            if (userDto.ProfileImage != null && userDto.ProfileImage.Length > 0)
            {
                if (!string.IsNullOrEmpty(existingUser.ProfileImagePath) && File.Exists(existingUser.ProfileImagePath))
                    File.Delete(existingUser.ProfileImagePath);

                var fileName = $"{Guid.NewGuid()}_{userDto.ProfileImage.FileName}";
                var filePath = Path.Combine(_profileImagesFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await userDto.ProfileImage.CopyToAsync(stream);
                }

                existingUser.ProfileImagePath = filePath;
                existingUser.ProfileImageFileName = fileName;
                existingUser.ProfileImageContentType = userDto.ProfileImage?.ContentType;
            }

            await _userRepository.UpdateAsync(existingUser);

            var userResponse = _mapper.Map<UserResponseDto>(existingUser);

            if (!string.IsNullOrEmpty(existingUser.ProfileImageFileName))
                userResponse.ProfileImageUrl = $"/api/user/{existingUser.Id}/profile-image";

            return userResponse;
        }


        public async Task<UserResponseDto> AuthenticateAsync(UserLoginDto loginDto)
        {
            var normalizedEmail = loginDto.Email.Trim().ToLower();
            var user = await _userRepository.GetByEmailAsync(normalizedEmail);

            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            var passwordToVerify = loginDto.Password.Trim();

            // For debugging only, remove in production
            Console.WriteLine($"Login email: {normalizedEmail}");
            Console.WriteLine($"Password to verify: '{passwordToVerify}'");
            Console.WriteLine($"Stored hash: '{user.Password}'");

            if (!PasswordHelper.VerifyPassword(passwordToVerify, user.Password))
            {
                Console.WriteLine("Password verification failed!");
                throw new UnauthorizedAccessException("Invalid password");
            }

            if (!user.Enabled)
                throw new UnauthorizedAccessException("Account not activated. Please contact an administrator.");

            if (user.IsFirstLogin)
            {
                user.PasswordResetToken = GenerateToken();
                user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(24);
                await _userRepository.UpdateAsync(user);

                var userResponse = _mapper.Map<UserResponseDto>(user);
                userResponse.PasswordChangeRequired = true;
                userResponse.PasswordResetToken = user.PasswordResetToken;

                if (!string.IsNullOrEmpty(user.ProfileImageFileName))
                    userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";

                return userResponse;
            }

            var response = _mapper.Map<UserResponseDto>(user);
            response.Token = GenerateJwtToken(user);

            if (!string.IsNullOrEmpty(user.ProfileImageFileName))
                response.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";

            response.PasswordChangeRequired = false;
            return response;
        }


        public async Task<bool> VerifyUserAccountAsync(UserVerificationDto verificationDto)
        {
            var user = await _userRepository.GetByIdAsync(verificationDto.UserId);

            if (user == null ||
                user.VerificationToken != verificationDto.Token ||
                user.VerificationTokenExpiry < DateTime.UtcNow)
            {
                return false;
            }

            // If admin approves the account
            if (verificationDto.IsApproved)
            {
                user.EmailVerified = true;
                user.VerificationToken = null;
                user.VerificationTokenExpiry = null;

                // Generate password reset token
                user.PasswordResetToken = GenerateToken();
                user.PasswordResetTokenExpiry = DateTime.UtcNow.AddDays(7); // Give them a week to set password

                await _userRepository.UpdateAsync(user);

                // Send email to user with password reset link
                var resetLink = $"{_baseUrl}/reset-password?token={user.PasswordResetToken}&userId={user.Id}";
                await _emailService.SendAccountApprovedEmailAsync(user.Email, user.NameUser, resetLink);

                return true;
            }
            else
            {
                // Admin rejected the account
                await _userRepository.DeleteAsync(user.Id);
                return true;
            }
        }

        public async Task<bool> RequestPasswordResetAsync(string email)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null) return false; // Don't reveal if email exists or not

            user.PasswordResetToken = GenerateToken();
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(24);

            await _userRepository.UpdateAsync(user);

            var resetLink = $"{_baseUrl}/reset-password?token={user.PasswordResetToken}&userId={user.Id}";
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.NameUser, resetLink);

            return true;
        }

        public async Task<bool> ResetPasswordAsync(PasswordResetDto resetDto)
        {
            var user = await _userRepository.GetByIdAsync(resetDto.UserId);
            if (user == null || user.PasswordResetToken != resetDto.Token || user.PasswordResetTokenExpiry < DateTime.UtcNow)
                return false;

            // Don't hash here - pass plain password
            // Replace with hashed version
            user.Password = PasswordHelper.HashPassword(resetDto.NewPassword);

            // Clear reset token and expiry
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;

            // Mark first login as done
            user.IsFirstLogin = false;

            // Enable user if needed
            if (!user.Enabled)
                user.Enabled = true;

            await _userRepository.UpdateAsync(user);

            return true;
        }
        public async Task<UserResponseDto> AuthenticateWithGoogleAsync(GoogleAuthDto googleAuth)
        {
            try
            {
                // Validate the Google ID token
                var validationSettings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { "your-google-client-id" } // Configure in settings
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(googleAuth.IdToken, validationSettings);

                // Check if user exists
                var user = await _userRepository.GetByEmailAsync(payload.Email);

                if (user == null)
                {
                    // Create new user with Google credentials
                    var newUser = new EYExpenseManager.Core.Entities.User
                    {
                        Email = payload.Email,
                        NameUser = payload.GivenName,
                        Surname = payload.FamilyName,
                        IdUser = payload.Subject.Substring(0, Math.Min(payload.Subject.Length, 50)),
                        Password = PasswordHelper.HashPassword(GenerateRandomPassword()),
                        Role = Role.User, // Default role
                        Enabled = true,
                        EmailVerified = true,
                        GoogleId = payload.Subject,
                        IsFirstLogin = false
                    };

                    user = await _userRepository.AddAsync(newUser);
                }
                else
                {
                    // Update Google ID if not set
                    if (string.IsNullOrEmpty(user.GoogleId))
                    {
                        user.GoogleId = payload.Subject;
                        await _userRepository.UpdateAsync(user);
                    }
                }

                // Return user with token
                var response = _mapper.Map<UserResponseDto>(user);
                response.Token = GenerateJwtToken(user);

                if (!string.IsNullOrEmpty(user.ProfileImageFileName))
                {
                    response.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
                }

                return response;
            }
            catch (Exception ex)
            {
                throw new UnauthorizedAccessException($"Google authentication failed: {ex.Message}");
            }
        }

        public async Task<IEnumerable<UserResponseDto>> GetPendingVerificationsAsync()
        {
            var users = await _userRepository.GetPendingVerificationsAsync();
            var userResponses = _mapper.Map<IEnumerable<UserResponseDto>>(users);

            foreach (var userResponse in userResponses)
            {
                var user = users.FirstOrDefault(u => u.Id == userResponse.Id);
                if (user != null && !string.IsNullOrEmpty(user.ProfileImageFileName))
                {
                    userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
                }

                // Include verification token
                userResponse.VerificationToken = user?.VerificationToken;
            }

            return userResponses;
        }

        // Helper methods
        private async Task SendVerificationEmailToAdmins(EYExpenseManager.Core.Entities.User newUser)
        {
            var admins = await _userRepository.GetUsersByRoleAsync(Role.Admin);

            foreach (var admin in admins)
            {
                var verificationLink = $"{_baseUrl}/verify-user?token={newUser.VerificationToken}&userId={newUser.Id}";
                await _emailService.SendVerificationEmailAsync(admin.Email, $"{newUser.NameUser} {newUser.Surname}", verificationLink);
            }
        }

        private string GenerateToken()
        {
            return Guid.NewGuid().ToString("N");
        }

        private string GenerateRandomPassword()
        {
            const string valid = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()";
            var random = new Random();
            var res = new StringBuilder();

            for (var i = 0; i < 12; i++)
            {
                res.Append(valid[random.Next(valid.Length)]);
            }

            return res.ToString();
        }

        private string GenerateJwtToken(EYExpenseManager.Core.Entities.User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public async Task<UserResponseDto> GetByIdAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                throw new InvalidOperationException("User not found");

            var userResponse = _mapper.Map<UserResponseDto>(user);

            // Set the URL for profile image if exists
            if (!string.IsNullOrEmpty(user.ProfileImageFileName))
            {
                userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
            }

            return userResponse;
        }

        public async Task<UserResponseDto> GetByEmailAsync(string email)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
                throw new InvalidOperationException("User not found");

            var userResponse = _mapper.Map<UserResponseDto>(user);

            // Set the URL for profile image if exists
            if (!string.IsNullOrEmpty(user.ProfileImageFileName))
            {
                userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
            }

            return userResponse;
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();
            var userResponses = _mapper.Map<IEnumerable<UserResponseDto>>(users);

            // Set URLs for profile images
            foreach (var userResponse in userResponses)
            {
                var user = users.FirstOrDefault(u => u.Id == userResponse.Id);
                if (user != null && !string.IsNullOrEmpty(user.ProfileImageFileName))
                {
                    userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
                }
            }

            return userResponses;
        }

        public async Task<IEnumerable<UserResponseDto>> GetUsersByRoleAsync(Role role)
        {
            var users = await _userRepository.GetUsersByRoleAsync(role);
            var userResponses = _mapper.Map<IEnumerable<UserResponseDto>>(users);

            // Set URLs for profile images
            foreach (var userResponse in userResponses)
            {
                var user = users.FirstOrDefault(u => u.Id == userResponse.Id);
                if (user != null && !string.IsNullOrEmpty(user.ProfileImageFileName))
                {
                    userResponse.ProfileImageUrl = $"/api/user/{user.Id}/profile-image";
                }
            }

            return userResponses;
        }

        public async Task DeleteUserAsync(int id)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(id);
                if (user != null && !string.IsNullOrEmpty(user.ProfileImagePath) && File.Exists(user.ProfileImagePath))
                {
                    File.Delete(user.ProfileImagePath);
                }

                await _userRepository.DeleteAsync(id);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete user: {ex.Message}");
            }
        }

        public async Task<byte[]> GetProfileImageAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.ProfileImagePath) || !File.Exists(user.ProfileImagePath))
            {
                throw new InvalidOperationException("Profile image not found");
            }

            return await File.ReadAllBytesAsync(user.ProfileImagePath);
        }

        
    }
}