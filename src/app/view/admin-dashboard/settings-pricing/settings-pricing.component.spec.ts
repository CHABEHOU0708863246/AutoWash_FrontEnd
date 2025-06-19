import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsPricingComponent } from './settings-pricing.component';

describe('SettingsPricingComponent', () => {
  let component: SettingsPricingComponent;
  let fixture: ComponentFixture<SettingsPricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPricingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsPricingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
