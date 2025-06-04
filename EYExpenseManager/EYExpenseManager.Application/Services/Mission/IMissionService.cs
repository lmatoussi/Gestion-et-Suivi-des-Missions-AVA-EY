using AutoMapper;
using FluentValidation;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Application.DTOs.Mission;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using EYExpenseManager.Core.Entities;


namespace EYExpenseManager.Application.Services.Mission
{
    public interface IMissionService
    {
        Task<MissionResponseDto> CreateMissionAsync(MissionCreateDto missionDto);
        Task<MissionResponseDto> UpdateMissionAsync(MissionUpdateDto missionDto);
        Task<MissionResponseDto> GetByIdAsync(int id);
        Task<MissionResponseDto> GetByIdMissionAsync(string idMission);
        Task<IEnumerable<MissionResponseDto>> GetAllMissionsAsync();
        Task<IEnumerable<MissionResponseDto>> GetMissionsByClientAsync(string client);
        Task<IEnumerable<MissionResponseDto>> GetMissionsByStatusAsync(string status);
        Task<IEnumerable<MissionResponseDto>> GetMissionsByAssocierAsync(int associerId);
        Task DeleteMissionAsync(int id);
    }

    public class MissionService : IMissionService
    {
        private readonly IMissionRepository _missionRepository;
        private readonly IMapper _mapper;
        private readonly IValidator<MissionCreateDto> _createValidator;
        private readonly IValidator<MissionUpdateDto> _updateValidator;

        public MissionService(
            IMissionRepository missionRepository,
            IMapper mapper,
            IValidator<MissionCreateDto> createValidator,
            IValidator<MissionUpdateDto> updateValidator)
        {
            _missionRepository = missionRepository;
            _mapper = mapper;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
        }

        public async Task<MissionResponseDto> CreateMissionAsync(MissionCreateDto missionDto)
        {
            // Validate input
            var validationResult = await _createValidator.ValidateAsync(missionDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            // Check for existing mission with same ID
            var existingMission = await _missionRepository.GetByIdMissionAsync(missionDto.IdMission);
            if (existingMission != null)
                throw new InvalidOperationException("Mission ID already exists");

            // Map and create mission
            var mission = _mapper.Map<EYExpenseManager.Core.Entities.Mission>(missionDto);
            mission.CreatedDate = DateTime.UtcNow;

            var createdMission = await _missionRepository.AddAsync(mission);
            return _mapper.Map<MissionResponseDto>(createdMission);
        }

        public async Task<MissionResponseDto> UpdateMissionAsync(MissionUpdateDto missionDto)
        {
            // Validate input
            var validationResult = await _updateValidator.ValidateAsync(missionDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var existingMission = await _missionRepository.GetByIdAsync(missionDto.Id);
            if (existingMission == null)
                throw new InvalidOperationException("Mission not found");

            // Check for IdMission uniqueness if changing
            if (missionDto.IdMission != null && missionDto.IdMission != existingMission.IdMission)
            {
                var idMission = await _missionRepository.GetByIdMissionAsync(missionDto.IdMission);
                if (idMission != null)
                    throw new InvalidOperationException("Mission ID already exists");
            }

            // Explicitly update fields
            existingMission.IdMission = missionDto.IdMission ?? existingMission.IdMission;
            existingMission.NomDeContract = missionDto.NomDeContract ?? existingMission.NomDeContract;
            existingMission.Client = missionDto.Client ?? existingMission.Client;
            existingMission.DateSignature = missionDto.DateSignature ?? existingMission.DateSignature;
            existingMission.EngagementCode = missionDto.EngagementCode ?? existingMission.EngagementCode;
            existingMission.Pays = missionDto.Pays ?? existingMission.Pays;
            existingMission.MontantDevise = missionDto.MontantDevise ?? existingMission.MontantDevise;
            existingMission.MontantTnd = missionDto.MontantTnd ?? existingMission.MontantTnd;
            existingMission.Ava = missionDto.Ava ?? existingMission.Ava;
            existingMission.AssocierId = missionDto.AssocierId ?? existingMission.AssocierId;
            existingMission.Status = missionDto.Status ?? existingMission.Status;

            await _missionRepository.UpdateAsync(existingMission);

            return _mapper.Map<MissionResponseDto>(existingMission);
        }

        public async Task<MissionResponseDto> GetByIdAsync(int id)
        {
            var mission = await _missionRepository.GetByIdAsync(id);
            return mission == null
                ? throw new InvalidOperationException("Mission not found")
                : _mapper.Map<MissionResponseDto>(mission);
        }

        public async Task<MissionResponseDto> GetByIdMissionAsync(string idMission)
        {
            var mission = await _missionRepository.GetByIdMissionAsync(idMission);
            return mission == null
                ? throw new InvalidOperationException("Mission not found")
                : _mapper.Map<MissionResponseDto>(mission);
        }

        public async Task<IEnumerable<MissionResponseDto>> GetAllMissionsAsync()
        {
            var missions = await _missionRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<MissionResponseDto>>(missions);
        }

        public async Task<IEnumerable<MissionResponseDto>> GetMissionsByClientAsync(string client)
        {
            var missions = await _missionRepository.GetMissionsByClientAsync(client);
            return _mapper.Map<IEnumerable<MissionResponseDto>>(missions);
        }

        public async Task<IEnumerable<MissionResponseDto>> GetMissionsByStatusAsync(string status)
        {
            var missions = await _missionRepository.GetMissionsByStatusAsync(status);
            return _mapper.Map<IEnumerable<MissionResponseDto>>(missions);
        }

        public async Task<IEnumerable<MissionResponseDto>> GetMissionsByAssocierAsync(int associerId)
        {
            var missions = await _missionRepository.GetMissionsByAssocierAsync(associerId);
            return _mapper.Map<IEnumerable<MissionResponseDto>>(missions);
        }

        public async Task DeleteMissionAsync(int id)
        {
            try
            {
                await _missionRepository.DeleteAsync(id);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete mission: {ex.Message}");
            }
        }
    }
}