import { useContests, useStandings } from '@/lib/api';
import {
  contestStatus,
  contestWhen,
  contestWinner,
  myStanding,
  standings,
  type Contest,
  type ContestStatus,
  type StandingRow,
} from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

export type ContestView = Contest & {
  status: ContestStatus;
  when: string;
  rows: StandingRow[];
  my: { line: string; pct: number };
  winner: string | null;
};

/** Contests joined with their live standings, from the signed-in user's point of view. */
export function useContestList() {
  const { userId } = useSalesBell();
  const contests = useContests();
  const all = useStandings();

  const data: ContestView[] | undefined = contests.data?.map((c) => {
    const rows = standings(
      c,
      (all.data ?? []).filter((r) => r.contest_id === c.id),
      userId,
    );
    return {
      ...c,
      status: contestStatus(c),
      when: contestWhen(c),
      rows,
      my: myStanding(rows),
      winner: contestWinner(rows),
    };
  });

  return {
    data,
    isPending: contests.isPending || all.isPending,
    isError: contests.isError || all.isError,
    refetch: () => Promise.all([contests.refetch(), all.refetch()]),
  };
}
