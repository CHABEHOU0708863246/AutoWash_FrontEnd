import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsVehiclesComponent } from './settings-vehicles.component';

describe('SettingsVehiclesComponent', () => {
  let component: SettingsVehiclesComponent;
  let fixture: ComponentFixture<SettingsVehiclesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsVehiclesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsVehiclesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
