using AutoMapper;
using EYExpenseManager.Core.Entities;
using EYExpenseManager.Application.DTOs.User;
using EYExpenseManager.Application.DTOs.Mission;
using EYExpenseManager.Application.DTOs.Expense;

namespace EYExpenseManager.Infrastructure.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // User Mappings
            CreateMap<User, UserCreateDto>().ReverseMap();
            CreateMap<User, UserUpdateDto>().ReverseMap();
            CreateMap<User, UserResponseDto>()
           .ForMember(dest => dest.ProfileImageContentType, opt => opt.MapFrom(src => src.ProfileImageContentType))
           .ForMember(dest => dest.ProfileImageUrl, opt => opt.MapFrom(src => src.ProfileImagePath)); // Map from ProfileImagePath


            CreateMap<User, UserLoginDto>().ReverseMap();

            // Mission Mappings
            CreateMap<Mission, MissionCreateDto>().ReverseMap();
            CreateMap<Mission, MissionUpdateDto>().ReverseMap();
            CreateMap<Mission, MissionResponseDto>().ReverseMap();

            // Expense Mappings
            CreateMap<Expense, ExpenseCreateDto>().ReverseMap();
            CreateMap<Expense, ExpenseUpdateDto>().ReverseMap();
            CreateMap<Expense, ExpenseResponseDto>().ReverseMap();

            // Configuration for handling ProfileImage
            CreateMap<UserCreateDto, User>()
                .ForMember(dest => dest.ProfileImagePath, opt => opt.Ignore())
                .ForMember(dest => dest.ProfileImageFileName, opt => opt.Ignore())
                .ForMember(dest => dest.ProfileImageContentType, opt => opt.Ignore());
        }
    }
}
