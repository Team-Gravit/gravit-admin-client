import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { QaApiError } from '@/shared/api/qaClient';

function responseError(data: unknown, status = 409) {
  return new AxiosError('mock', undefined, undefined, undefined, {
    data,
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe('getErrorMessage', () => {
  it.each([{ message: '서버 원문' }, { code: 'CONFLICT', message: '서버 원문' }, { error: 'CONFLICT', message: '서버 원문' }])('코드 필드와 무관하게 문자열 message가 있으면 원문을 반환한다', (data) => {
    expect(getErrorMessage(responseError(data))).toBe('서버 원문');
  });

  it.each([null, undefined, 'html', [], {}, { message: '' }, { message: ['필드 오류'] }, { message: { title: '필수' } }])('문자열 안내가 없으면 기존 HTTP 기본 문구를 반환한다', (data) => {
    expect(getErrorMessage(responseError(data))).toBe('상태 전이가 허용되지 않습니다.');
  });

  it('응답이 없는 AxiosError면 네트워크 안내를 반환한다', () => {
    expect(getErrorMessage(new AxiosError('offline'))).toBe('네트워크 연결을 확인해주세요.');
  });

  it('알 수 없는 상태와 일반 오류면 기존 대체 문구를 반환한다', () => {
    expect(getErrorMessage(responseError({}, 418))).toBe('처리에 실패했습니다. 다시 시도해주세요.');
    expect(getErrorMessage(new Error('private detail'))).toBe('처리에 실패했습니다. 다시 시도해주세요.');
  });

  it('QA 전용 오류면 이미 정한 안내를 그대로 반환한다', () => {
    expect(getErrorMessage(new QaApiError(503, 'QA 전용 안내', null))).toBe('QA 전용 안내');
  });
});
