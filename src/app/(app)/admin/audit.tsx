import { BackLink, ListCard, ListRow, Notice, SBText, Screen, Title } from '@/components/sb/ui';
import { useAudit } from '@/lib/api';
import { relativeDay, timeLabel } from '@/lib/salesbell';
import { useColors } from '@/store/salesbell-store';

export default function AuditScreen() {
  const c = useColors();
  const audit = useAudit();
  const entries = audit.data ?? [];
  return (
    <Screen stack>
      <BackLink label="Admin" />
      <Title sub="Changes to sales, products and users are recorded here and can't be edited.">Audit log</Title>
      {audit.isError ? (
        <Notice onRetry={() => audit.refetch()}>Couldn&apos;t load the audit log.</Notice>
      ) : entries.length ? (
        <ListCard>
          {entries.map((a, i) => {
            const when = new Date(a.created_at);
            return (
              <ListRow key={a.id} last={i === entries.length - 1} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <SBText w={600} lh={1.35}>
                  {a.action}
                </SBText>
                <SBText size={13} color={c.mut}>
                  {a.actor_name} · {relativeDay(when)} {timeLabel(when)}
                </SBText>
              </ListRow>
            );
          })}
        </ListCard>
      ) : audit.isPending ? null : (
        <Notice>Nothing logged yet.</Notice>
      )}
    </Screen>
  );
}
