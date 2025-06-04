using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EYExpenseManager.Application.Services.User;
using EYExpenseManager.Application.DTOs.User;
using EYExpenseManager.Core.Entities;
using System.Collections.Generic;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;

namespace EYExpenseManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetById(int id)
        {
            try
            {
                var user = await _userService.GetByIdAsync(id);
                return Ok(user);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("email/{email}")]
        public async Task<ActionResult<UserResponseDto>> GetByEmail(string email)
        {
            try
            {
                var user = await _userService.GetByEmailAsync(email);
                return Ok(user);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<UserResponseDto>> Create([FromForm] UserCreateDto userDto)
        {
            try
            {
                var createdUser = await _userService.CreateUserAsync(userDto);
                return CreatedAtAction(nameof(GetById), new { id = createdUser.Id }, createdUser);
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Errors);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, "Database error: " + ex.InnerException?.Message);
            }
        }

        [HttpPut("{id}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Update(int id, [FromForm] UserUpdateDto userDto)
        {
            if (!ModelState.IsValid || id != userDto.Id)
                return BadRequest();

            try
            {
                await _userService.UpdateUserAsync(userDto);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _userService.DeleteUserAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("associers")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAssociers()
        {
            var associers = await _userService.GetUsersByRoleAsync(Role.Associer);
            return Ok(associers);
        }

        [HttpGet("role/{role}")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetByRole(Role role)
        {
            var users = await _userService.GetUsersByRoleAsync(role);
            return Ok(users);
        }

        [HttpPost("authenticate")]
        public async Task<ActionResult<UserResponseDto>> Authenticate(UserLoginDto loginDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userService.AuthenticateAsync(loginDto);
                return Ok(user);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        [HttpPost("google-auth")]
        public async Task<ActionResult<UserResponseDto>> GoogleAuthenticate(GoogleAuthDto googleAuth)
        {
            try
            {
                var user = await _userService.AuthenticateWithGoogleAsync(googleAuth);
                return Ok(user);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("verify")]
        [AllowAnonymous] // <-- Add this line!
        public async Task<ActionResult> VerifyUser(UserVerificationDto verificationDto)
        {
            var result = await _userService.VerifyUserAccountAsync(verificationDto);
            if (result)
            {
                return Ok(new { message = "User verification processed successfully" });
            }

            return BadRequest(new { message = "Invalid verification token or user ID" });
        }

        [HttpPost("request-password-reset")]
        public async Task<ActionResult> RequestPasswordReset(PasswordResetRequestDto requestDto)
        {
            await _userService.RequestPasswordResetAsync(requestDto.Email);

            // Always return OK, even if email not found (prevents email enumeration)
            return Ok(new { message = "If your email exists in our system, you will receive a password reset link" });
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult> ResetPassword(PasswordResetDto resetDto)
        {
            var result = await _userService.ResetPasswordAsync(resetDto);
            if (result)
            {
                return Ok(new { message = "Password reset successfully" });
            }

            return BadRequest(new { message = "Invalid reset token or user ID" });
        }

        [HttpGet("pending-verifications")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetPendingVerifications()
        {
            var pendingUsers = await _userService.GetPendingVerificationsAsync();
            return Ok(pendingUsers);
        }

        [HttpGet("{id}/profile-image")]
        public async Task<ActionResult> GetProfileImage(int id)
        {
            try
            {
                var imageBytes = await _userService.GetProfileImageAsync(id);

                // Get the user to get content type information
                var user = await _userService.GetByIdAsync(id);
                string contentType = user.ProfileImageContentType ?? "application/octet-stream";

                return File(imageBytes, contentType);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}