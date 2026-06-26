---
id: TASK-099
title: "Add password strength indicator and match validation on RegisterPage"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-098]
blocks: []
parallel_safe_with: [TASK-100, TASK-101, TASK-102, TASK-103, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-099]]"
tags: [ui, frontend, auth, ux]
---

# TASK-099 — Add password strength indicator and match validation on RegisterPage

## Objective

Show a visual password strength meter below the password field on RegisterPage, and display a real-time "Passwords do not match" warning below the confirm field before the user submits.

## Approach

Strength is computed inline: ≥8 chars = weak, ≥12 chars + mixed case = moderate, ≥12 chars + mixed case + digit + symbol = strong. Display as a coloured bar (red/amber/green) with a text label. Match indicator: show a small red message if `confirm.length > 0 && password !== confirm`. No third-party library. TASK-098 must complete first to avoid RegisterPage conflicts.

## Steps

### 1. Add password strength meter  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/auth/RegisterPage.tsx`
- [x] Add a `passwordStrength(pw: string): 'weak' | 'moderate' | 'strong'` helper above the component:
  ```ts
  function passwordStrength(pw: string): 'weak' | 'moderate' | 'strong' {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    if (pw.length >= 12 && hasLower && hasUpper && hasDigit && hasSymbol) return 'strong';
    if (pw.length >= 8 && ((hasLower && hasUpper) || hasDigit)) return 'moderate';
    return 'weak';
  }
  ```
- [x] Add the strength bar JSX immediately after the `id="password"` input wrapper div:
  ```tsx
  {password.length > 0 && (() => {
    const strength = passwordStrength(password);
    return (
      <div className="mt-1.5">
        <div className="flex gap-1">
          <div className={`h-1 flex-1 rounded ${strength === 'weak' ? 'bg-red-400' : 'bg-green-400'}`} />
          <div className={`h-1 flex-1 rounded ${strength === 'moderate' || strength === 'strong' ? 'bg-green-400' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded ${strength === 'strong' ? 'bg-green-600' : 'bg-gray-200'}`} />
        </div>
        <p className={`text-[11px] mt-0.5 ${strength === 'weak' ? 'text-red-500' : strength === 'moderate' ? 'text-amber-600' : 'text-green-600'}`}>
          {strength === 'weak' ? 'Weak' : strength === 'moderate' ? 'Moderate' : 'Strong'}
        </p>
      </div>
    );
  })()}
  ```

### 2. Add real-time match validation  <!-- agent: general-purpose -->

- [x] Add the match indicator JSX immediately after the `id="confirm"` input wrapper div:
  ```tsx
  {confirm.length > 0 && password !== confirm && (
    <p className="text-[11px] text-red-500 mt-0.5">Passwords do not match</p>
  )}
  ```
- [x] Verify TypeScript compiles clean
