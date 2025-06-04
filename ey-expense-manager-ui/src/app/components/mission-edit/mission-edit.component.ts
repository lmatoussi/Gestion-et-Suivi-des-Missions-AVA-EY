import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Mission, MissionUpdate } from '../../models/Mission';

@Component({
  selector: 'app-mission-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './mission-edit.component.html',
  styleUrls: ['./mission-edit.component.scss'],
})
export class MissionEditComponent implements OnInit {
  missionForm: FormGroup;
  associers = [
    { id: 1, nameUser: 'Aziz', surname: 'Smith' },
    { id: 2, nameUser: 'Ahmed', surname: 'Jones' },
  ];
  submitting = false;
  loading = true;
  error = '';
  currentUser: User | null = null;
  mission: Mission | null = null;
  missionId: number | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private missionService: MissionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.missionForm = this.formBuilder.group({});
    this.initForm();
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.missionId = +id;
        this.loadMission(this.missionId);
      } else {
        this.error = 'No mission ID provided';
        this.loading = false;
      }
    });
  }

  private initForm(): void {
    this.missionForm = this.formBuilder.group({
      idMission: ['', [Validators.required, Validators.maxLength(50)]],
      nomDeContract: ['', [Validators.required, Validators.maxLength(100)]],
      client: ['', [Validators.required, Validators.maxLength(100)]],
      dateSignature: ['', Validators.required],
      engagementCode: ['', Validators.maxLength(50)],
      pays: ['', Validators.maxLength(50)],
      montantDevise: [0, [Validators.required, Validators.min(0)]],
      montantTnd: [0, [Validators.required, Validators.min(0)]],
      ava: [0, [Validators.required, Validators.min(0)]],
      associerId: [null],
      status: ['', Validators.required],
      updatedBy: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  loadMission(id: number): void {
    this.loading = true;
    this.missionService.getMissionById(id).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.patchFormValues(mission);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading mission:', err);
        this.error =
          'Failed to load mission details: ' +
          (err.error || err.message || 'Unknown error');
        this.loading = false;
      },
    });
  }

  patchFormValues(mission: Mission): void {
    const dateSignature = mission.dateSignature
      ? new Date(mission.dateSignature).toISOString().split('T')[0]
      : null;

    this.missionForm.patchValue({
      idMission: mission.idMission,
      nomDeContract: mission.nomDeContract,
      client: mission.client,
      dateSignature: dateSignature,
      engagementCode: mission.engagementCode || '',
      pays: mission.pays || '',
      montantDevise: mission.montantDevise,
      montantTnd: mission.montantTnd,
      ava: mission.ava,
      associerId: mission.associerId,
      status: mission.status,
      updatedBy: this.currentUser?.surname || 'System',
    });
  }

  onSubmit(): void {
    if (this.missionForm.invalid) {
      Object.keys(this.missionForm.controls).forEach((key) => {
        const control = this.missionForm.get(key);
        control?.markAsTouched();
      });
      console.log('Form is invalid:', this.missionForm.errors);
      return;
    }

    if (!this.missionId) {
      this.error = 'Mission ID is missing';
      return;
    }

    this.submitting = true;
    this.error = '';

    const formValues = this.missionForm.value;

    const missionData: MissionUpdate = {
      id: this.missionId, // Ensure you send the ID
      idMission: formValues.idMission,
      nomDeContract: formValues.nomDeContract,
      client: formValues.client,
      dateSignature: formValues.dateSignature,
      engagementCode: formValues.engagementCode,
      pays: formValues.pays,
      montantDevise: formValues.montantDevise,
      montantTnd: formValues.montantTnd,
      ava: formValues.ava,
      associerId: formValues.associerId,
      status: formValues.status,
      updatedBy: this.currentUser?.surname || 'System',
    };

    console.log('Mission data to be updated:', missionData);

    this.missionService
      .updateMission(this.missionId, missionData)
      .subscribe({
        next: () => {
          console.log('Mission updated successfully');
          this.router.navigate(['/missions']);
        },
        error: (err: any) => {
          console.error('Error updating mission:', err);
          this.error =
            'Failed to update mission: ' +
            (err.error || err.message || 'Unknown error');
          this.submitting = false;

          if (err && err.status === 400 && err.error) {
            if (Array.isArray(err.error)) {
              err.error.forEach((error: any) => {
                if (error?.includes('IdMission')) {
                  this.missionForm
                    .get('idMission')
                    ?.setErrors({ serverError: error });
                }
              });
            }
          }
        },
      });
  }
}
