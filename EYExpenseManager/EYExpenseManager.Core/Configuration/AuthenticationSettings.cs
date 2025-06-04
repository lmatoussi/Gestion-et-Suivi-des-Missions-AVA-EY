namespace EYExpenseManager.Core.Configuration
{
    public class AuthenticationSettings
    {
        public string JwtSecret { get; set; } = string.Empty;
        public string GoogleClientId { get; set; } = string.Empty;
        public string GoogleClientSecret { get; set; } = string.Empty;
    }
}
