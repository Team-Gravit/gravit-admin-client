import { useCurrentAdmin } from '@/features/auth/hooks';
import { RavvitConversation } from '@/features/ravvit/components/RavvitConversation';

/** 무제목은 D8-7의 화면 결정입니다. 닉네임을 주입해 feature 간 직접 참조를 피합니다. */
export function RavvitPage() {
  const admin = useCurrentAdmin();

  return <RavvitConversation nickname={admin?.nickname ?? null} />;
}
