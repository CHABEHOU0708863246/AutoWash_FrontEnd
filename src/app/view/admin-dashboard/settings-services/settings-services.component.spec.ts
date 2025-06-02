import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsServicesComponent } from './settings-services.component';

describe('SettingsServicesComponent', () => {
  let component: SettingsServicesComponent;
  let fixture: ComponentFixture<SettingsServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
