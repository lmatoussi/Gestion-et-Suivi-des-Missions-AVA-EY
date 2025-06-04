import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionCreateComponent } from './mission-create.component';

describe('MissionCreateComponent', () => {
  let component: MissionCreateComponent;
  let fixture: ComponentFixture<MissionCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
