import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Allocazioni } from './allocazioni';

describe('Allocazioni', () => {
  let component: Allocazioni;
  let fixture: ComponentFixture<Allocazioni>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Allocazioni],
    }).compileComponents();

    fixture = TestBed.createComponent(Allocazioni);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
