import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashNowComponent } from './wash-now.component';

describe('WashNowComponent', () => {
  let component: WashNowComponent;
  let fixture: ComponentFixture<WashNowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashNowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashNowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
