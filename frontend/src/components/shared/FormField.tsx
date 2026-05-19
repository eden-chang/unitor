/**
 * Label + child input wrapper used across forms.
 *
 * Renamed from the prototype's terse ``F``. The shape is unchanged:
 * ``<FormField l="Label" id="input-id"><Input … /></FormField>``.
 */

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

interface FormFieldProps {
  l: string;
  id?: string;
  children: ReactNode;
}

export function FormField({ l, id, children }: FormFieldProps) {
  return (
    <div className="mb-[18px]">
      <Label
        htmlFor={id}
        className="text-[11px] font-bold text-gray-600 mb-[7px] block uppercase tracking-[1px]"
      >
        {l}
      </Label>
      {children}
    </div>
  );
}
