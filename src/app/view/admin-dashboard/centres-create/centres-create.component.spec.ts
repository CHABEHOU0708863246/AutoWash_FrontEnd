import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentresCreateComponent } from './centres-create.component';

describe('CentresCreateComponent', () => {
  let component: CentresCreateComponent;
  let fixture: ComponentFixture<CentresCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentresCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentresCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
