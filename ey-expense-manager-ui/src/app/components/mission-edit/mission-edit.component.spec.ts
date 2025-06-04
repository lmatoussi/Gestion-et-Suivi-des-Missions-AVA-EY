import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionEditComponent } from './mission-edit.component';

describe('MissionEditComponent', () => {
  let component: MissionEditComponent;
  let fixture: ComponentFixture<MissionEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
