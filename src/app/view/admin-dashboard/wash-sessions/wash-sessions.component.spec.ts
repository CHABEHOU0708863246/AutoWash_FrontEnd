import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashSessionsComponent } from './wash-sessions.component';

describe('WashSessionsComponent', () => {
  let component: WashSessionsComponent;
  let fixture: ComponentFixture<WashSessionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashSessionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
