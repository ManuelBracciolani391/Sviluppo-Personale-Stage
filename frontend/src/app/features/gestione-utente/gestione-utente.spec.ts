import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestioneUtente } from './gestione-utente';

describe('GestioneUtente', () => {
  let component: GestioneUtente;
  let fixture: ComponentFixture<GestioneUtente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestioneUtente],
    }).compileComponents();

    fixture = TestBed.createComponent(GestioneUtente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
