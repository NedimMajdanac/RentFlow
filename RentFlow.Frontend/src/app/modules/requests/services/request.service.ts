import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { PagedResult } from '../../properties/property.models';
import { CreateRequestBody, CreateRequestResult, MyRequest, MyRequestsQuery } from '../request.models';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/requests`;

  create(body: CreateRequestBody): Observable<CreateRequestResult> {
    return this.http.post<CreateRequestResult>(this.base, body);
  }

  mine(q: MyRequestsQuery): Observable<PagedResult<MyRequest>> {
    let params = new HttpParams().set('pageNumber', q.pageNumber).set('pageSize', q.pageSize);
    if (q.status) params = params.set('status', q.status);
    if (q.listingType) params = params.set('listingType', q.listingType);
    return this.http.get<PagedResult<MyRequest>>(`${this.base}/my`, { params });
  }
}