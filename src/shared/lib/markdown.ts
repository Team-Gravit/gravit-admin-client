import remarkGfm from 'remark-gfm';

/** XSS 방지를 위해 react-markdown의 기본 HTML 비허용 정책을 유지합니다(D6). */
export const remarkPlugins = [remarkGfm];
