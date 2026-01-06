import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerProfilComponent } from './manager-profil.component';

describe('ManagerProfilComponent', () => {
  let component: ManagerProfilComponent;
  let fixture: ComponentFixture<ManagerProfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerProfilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerProfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
