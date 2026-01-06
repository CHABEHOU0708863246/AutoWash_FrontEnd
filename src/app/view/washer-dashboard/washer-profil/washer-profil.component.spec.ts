import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WasherProfilComponent } from './washer-profil.component';

describe('WasherProfilComponent', () => {
  let component: WasherProfilComponent;
  let fixture: ComponentFixture<WasherProfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasherProfilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WasherProfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
