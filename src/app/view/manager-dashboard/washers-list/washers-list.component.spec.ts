import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashersListComponent } from './washers-list.component';

describe('WashersListComponent', () => {
  let component: WashersListComponent;
  let fixture: ComponentFixture<WashersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashersListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
