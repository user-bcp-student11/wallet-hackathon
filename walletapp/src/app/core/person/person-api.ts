import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { PersonLookupRequest, PersonLookupResponse } from './person.model';

@Service()
export class PersonApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * POST /persons/lookup: consulta si existe una persona de prueba con ese tipo y número.
   *
   * Solo para la demostración: una consulta abierta por documento permite enumerar usuarios y en
   * producción exige autenticación y autorización (ver reglas-de-negocio/activacion-con-documento.md).
   * El número va en el cuerpo, no en la URL, para no dejarlo en registros de acceso.
   */
  lookup(request: PersonLookupRequest): Observable<PersonLookupResponse> {
    return this.http.post<PersonLookupResponse>(`${this.baseUrl}/persons/lookup`, request);
  }
}
