import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBlankComponent } from './dashboard-blank.component';

describe('DashboardBlankComponent', () => {
  let component: DashboardBlankComponent;
  let fixture: ComponentFixture<DashboardBlankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardBlankComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardBlankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
