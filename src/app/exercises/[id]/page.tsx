import { ExerciseDetailClient } from "./exercise-detail-client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ExerciseDetailPage() {
  return <ExerciseDetailClient />;
}
