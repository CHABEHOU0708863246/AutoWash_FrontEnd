import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WashNewComponent } from './wash-new.component';

describe('WashNewComponent', () => {
  let component: WashNewComponent;
  let fixture: ComponentFixture<WashNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WashNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WashNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
