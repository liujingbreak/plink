import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Dev404Component } from './dev404.component';

describe('Dev404Component', () => {
  let component: Dev404Component;
  let fixture: ComponentFixture<Dev404Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Dev404Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Dev404Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
