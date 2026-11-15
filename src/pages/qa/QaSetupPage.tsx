import { useParams } from 'react-router';
import { useSprint } from '@/features/qa/queries';
import { SetupPanel } from '@/features/qa/components/SetupPanel';

export function QaSetupPage() {
  const { sprintId } = useParams();
  const { data: sprint } = useSprint(Number(sprintId));
  if (!sprint) return null;
  return <SetupPanel sprint={sprint} />;
}
