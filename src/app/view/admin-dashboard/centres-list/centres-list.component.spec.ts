import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentresListComponent } from './centres-list.component';

describe('CentresListComponent', () => {
  let component: CentresListComponent;
  let fixture: ComponentFixture<CentresListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentresListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentresListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
