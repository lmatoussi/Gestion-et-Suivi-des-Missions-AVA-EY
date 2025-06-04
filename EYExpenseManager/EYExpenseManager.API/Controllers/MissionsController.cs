using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EYExpenseManager.Application.Services.Mission;
using EYExpenseManager.Application.DTOs.Mission;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System;

namespace EYExpenseManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MissionController : ControllerBase
    {
        private readonly IMissionService _missionService;

        public MissionController(IMissionService missionService)
        {
            _missionService = missionService;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MissionResponseDto>> GetById(int id)
        {
            try
            {
                var mission = await _missionService.GetByIdAsync(id);
                return Ok(mission);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("idmission/{idMission}")]
        public async Task<ActionResult<MissionResponseDto>> GetByIdMission(string idMission)
        {
            try
            {
                var mission = await _missionService.GetByIdMissionAsync(idMission);
                return Ok(mission);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MissionResponseDto>>> GetAll()
        {
            var missions = await _missionService.GetAllMissionsAsync();
            return Ok(missions);
        }

        [HttpPost]
        public async Task<ActionResult<MissionResponseDto>> Create(MissionCreateDto missionDto)
        {
            try
            {
                var createdMission = await _missionService.CreateMissionAsync(missionDto);
                return CreatedAtAction(nameof(GetById),
                    new { id = createdMission.Id },
                    createdMission);
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
        public async Task<IActionResult> Update(int id, MissionUpdateDto missionDto)
        {
            if (!ModelState.IsValid || id != missionDto.Id)
                return BadRequest();

            try
            {
                await _missionService.UpdateMissionAsync(missionDto);
                return NoContent();
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Errors);
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
                await _missionService.DeleteMissionAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("client/{client}")]
        public async Task<ActionResult<IEnumerable<MissionResponseDto>>> GetByClient(string client)
        {
            var missions = await _missionService.GetMissionsByClientAsync(client);
            return Ok(missions);
        }

        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<MissionResponseDto>>> GetByStatus(string status)
        {
            var missions = await _missionService.GetMissionsByStatusAsync(status);
            return Ok(missions);
        }

        [HttpGet("associer/{associerId}")]
        public async Task<ActionResult<IEnumerable<MissionResponseDto>>> GetByAssocier(int associerId)
        {
            var missions = await _missionService.GetMissionsByAssocierAsync(associerId);
            return Ok(missions);
        }
    }
}