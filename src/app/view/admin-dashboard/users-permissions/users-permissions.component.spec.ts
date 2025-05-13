import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersPermissionsComponent } from './users-permissions.component';

describe('UsersPermissionsComponent', () => {
  let component: UsersPermissionsComponent;
  let fixture: ComponentFixture<UsersPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
