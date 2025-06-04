    using EYExpenseManager.Infrastructure.Data;
    using Microsoft.EntityFrameworkCore;
    using EYExpenseManager.Application.Services.User;
    using FluentValidation;
    using EYExpenseManager.Application.Validators.User;
    using EYExpenseManager.Infrastructure.Repositories;
    using EYExpenseManager.Core.Interfaces;
    using EYExpenseManager.Application.DTOs.Mission;
    using EYExpenseManager.Application.Services.Mission;
    using EYExpenseManager.Application.Validators.Mission;
    using EYExpenseManager.Application.DTOs.Expense;
    using EYExpenseManager.Application.Services.Expense;
    using EYExpenseManager.Application.Validators.Expense;
    using FluentValidation.AspNetCore;
    using AutoMapper;
    using System.Text;
    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.IdentityModel.Tokens; // For TokenValidationParameters and SymmetricSecurityKey
    using System.IdentityModel.Tokens.Jwt; // For JWT handling
    using System.Security.Claims; // For ClaimTypes
using EYExpenseManager.Core.Configuration; // Add this line



using Microsoft.Extensions.FileProviders;
    using Microsoft.AspNetCore.Http.Features;
    using EYExpenseManager.Application.Services;
    using EYExpenseManager.Application.Services.Email;



    var builder = WebApplication.CreateBuilder(args);

    // Add services
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    // AutoMapper
    builder.Services.AddAutoMapper(typeof(EYExpenseManager.Infrastructure.Mapping.MappingProfile));

    // Database Context
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            b =>
            {
                b.MigrationsAssembly("EYExpenseManager.Infrastructure");
                b.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            }
        ));

    // Dependency Injection for Repositories
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<IMissionRepository, MissionRepository>();
    builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();

    // Dependency Injection for Services
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IMissionService, MissionService>();
    builder.Services.AddScoped<IExpenseService, ExpenseService>();
    builder.Services.AddScoped<IDocumentProcessingService, DocumentProcessingService>();
    builder.Services.AddScoped<IEmailService, EmailService>(); // <-- Add this line


    // Register FluentValidation Validators
    builder.Services.AddValidatorsFromAssemblyContaining<UserCreateDtoValidator>();

    // Register Mission Validators
    builder.Services.AddScoped<IValidator<MissionCreateDto>, MissionCreateDtoValidator>();
    builder.Services.AddScoped<IValidator<MissionUpdateDto>, MissionUpdateDtoValidator>();

    // Register Expense Validators
    builder.Services.AddScoped<IValidator<ExpenseCreateDto>, ExpenseCreateDtoValidator>();
    builder.Services.AddScoped<IValidator<ExpenseUpdateDto>, ExpenseUpdateDtoValidator>();
    builder.Services.AddScoped<IValidator<ExpenseCreateFromDocumentDto>, ExpenseCreateFromDocumentDtoValidator>();

    // Configure file upload size limit (increase if needed for larger profile pictures)
    builder.Services.Configure<FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB limit
    });

    // CORS Policy for Angular
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAngularApp",
            policy =>
            {
                policy.WithOrigins("http://localhost:4200")
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
    });

    // Email and JWT Settings
    builder.Services.Configure<EmailServiceConfiguration>(
        builder.Configuration.GetSection("EmailSettings"));

builder.Services.Configure<EYExpenseManager.Core.Configuration.AuthenticationSettings>(
 builder.Configuration.GetSection("Authentication"));

// JWT Authentication
var authSettings = builder.Configuration.GetSection("Authentication").Get<AuthenticationSettings>();
if (string.IsNullOrWhiteSpace(authSettings?.JwtSecret))
    throw new InvalidOperationException("JWT Secret not configured in appsettings.json");

var key = Encoding.ASCII.GetBytes(authSettings.JwtSecret);

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };
    })
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Authentication:GoogleClientId"];
        options.ClientSecret = builder.Configuration["Authentication:GoogleClientSecret"];
    });


    // Configure file storage paths
    var baseStoragePath = Path.Combine(builder.Environment.ContentRootPath, "Storage");
    var uploadsFolder = Path.Combine(baseStoragePath, "Uploads", "Documents");
    var thumbnailsFolder = Path.Combine(baseStoragePath, "Uploads", "Thumbnails");
    var profileImagesFolder = Path.Combine(baseStoragePath, "Uploads", "ProfileImages");

    // Ensure directories exist
    Directory.CreateDirectory(uploadsFolder);
    Directory.CreateDirectory(thumbnailsFolder);
    Directory.CreateDirectory(profileImagesFolder);

    builder.Services.AddSingleton<IFileProvider>(new PhysicalFileProvider(baseStoragePath));

    // Inject configuration for file paths
    builder.Services.AddSingleton(new DocumentServiceConfiguration
    {
        BaseStoragePath = baseStoragePath,
        UploadsFolder = uploadsFolder,
        ThumbnailsFolder = thumbnailsFolder,
        ProfileImagesFolder = profileImagesFolder
    });

    var app = builder.Build();

    // Middleware Configuration
    app.UseCors("AllowAngularApp");
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseAuthorization();
    app.MapControllers();

    // Serve static files from the Storage directory
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(baseStoragePath),
        RequestPath = "/Storage"
    });

    app.Run();

    public class DocumentServiceConfiguration
    {
        public string BaseStoragePath { get; set; }
        public string UploadsFolder { get; set; }
        public string ThumbnailsFolder { get; set; }
        public string ProfileImagesFolder { get; set; }
    }
  