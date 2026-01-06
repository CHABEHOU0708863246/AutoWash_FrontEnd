import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashTodayComponent } from './wash-today.component';

describe('WashTodayComponent', () => {
  let component: WashTodayComponent;
  let fixture: ComponentFixture<WashTodayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashTodayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashTodayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
