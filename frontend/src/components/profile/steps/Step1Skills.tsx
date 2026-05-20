/**
 * Profile wizard step 1 — pick at least 2 skills with proficiency.
 *
 * Skill catalog comes from `GET /courses/{id}/skills`. Selection is held
 * in the wizard's shared state so step 3 can submit it alongside the
 * profile row.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Nav } from "@/components/shared/Nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useCourseSkills } from "@/hooks/useCourseSkills";
import {
  proficiencyFromApi,
  proficiencyToApi,
  useWizardState,
} from "@/hooks/useWizardState";
import type { GoProps } from "@/types/ui";

const PROFICIENCY_TITLES = ["Beginner", "Intermediate", "Proficient", "Expert"] as const;
const MIN_SKILLS = 2;

export function Step1Skills({ go }: GoProps) {
  const { enrollments } = useAuth();
  const courseId = enrollments[0]?.course.id;
  const { data: catalog, isLoading, error } = useCourseSkills(courseId);
  const { skills, setSkills } = useWizardState();

  const selectedIds = new Set(skills.map((s) => s.course_skill_id));

  const toggle = (skillId: string) => {
    if (selectedIds.has(skillId)) {
      setSkills(skills.filter((s) => s.course_skill_id !== skillId));
    } else {
      setSkills([...skills, { course_skill_id: skillId, proficiency: "intermediate" }]);
    }
  };

  const setProficiency = (skillId: string, title: string) => {
    setSkills(
      skills.map((s) =>
        s.course_skill_id === skillId ? { ...s, proficiency: proficiencyToApi(title) } : s,
      ),
    );
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <Nav
        go={go}
        right={
          <span className="text-[13px] text-gray-500 leading-relaxed">
            CSC318 · Profile
          </span>
        }
      />
      <div className="max-w-[680px] mx-auto py-14 px-6">
        <Button
          variant="ghost"
          className="text-gray-600 font-medium mb-5 px-0 h-auto text-sm"
          onClick={() => go("prof-0")}
        >
          ← Back
        </Button>
        <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-[1px]">
          Step 2 of 4
        </div>
        <Progress
          value={(2 / 4) * 100}
          className="h-[3px] bg-gray-100 rounded-sm mb-8"
        />
        <h1 className="text-[28px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          Your Skills
        </h1>
        <p className="text-base text-gray-600 mb-9 leading-relaxed">
          Select at least {MIN_SKILLS} skills.
        </p>

        {isLoading && (
          <p className="text-[13px] text-gray-500 mb-5">Loading skill catalog…</p>
        )}
        {error && (
          <p className="text-[13px] text-danger mb-5">
            Couldn&apos;t load skills: {error.message}
          </p>
        )}

        <div className="mb-5">
          {catalog?.map((sk) => (
            <button
              key={sk.id}
              type="button"
              aria-pressed={selectedIds.has(sk.id)}
              className={cn(
                "inline-block py-1.5 px-3.5 rounded-full text-[13px] font-medium cursor-pointer mr-1.5 mb-2 border-[1.5px] transition-colors",
                selectedIds.has(sk.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",
              )}
              onClick={() => toggle(sk.id)}
            >
              {sk.skill_name}
            </button>
          ))}
        </div>

        {skills.length > 0 && catalog && (
          <Card className="p-0 mb-6 gap-0 shadow-none overflow-hidden">
            {skills.map((s, i) => {
              const meta = catalog.find((c) => c.id === s.course_skill_id);
              if (!meta) return null;
              return (
                <div
                  key={s.course_skill_id}
                  className={cn(
                    "flex justify-between items-center px-5 py-3",
                    i < skills.length - 1 && "border-b border-gray-100",
                  )}
                >
                  <span className="text-sm font-medium">{meta.skill_name}</span>
                  <div className="flex gap-1">
                    {PROFICIENCY_TITLES.map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={proficiencyFromApi(s.proficiency) === l}
                        className={cn(
                          "py-1 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-colors",
                          proficiencyFromApi(s.proficiency) === l
                            ? "bg-primary text-primary-foreground"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        )}
                        onClick={() => setProficiency(s.course_skill_id, l)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {skills.length > 0 && skills.length < MIN_SKILLS && (
          <p className="text-[13px] text-danger mb-3">
            Select at least {MIN_SKILLS - skills.length} more skill
            {MIN_SKILLS - skills.length === 1 ? "" : "s"}.
          </p>
        )}
        <Button
          className="w-full px-7 py-3 h-auto"
          disabled={skills.length < MIN_SKILLS}
          onClick={() => go("prof-2")}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
