
// password strength calculator — purely frontend
export type StrengthLevel = "empty" | "weak" | "fair" | "strong" | "very_strong"

export interface PasswordStrength {
  level: StrengthLevel
  score: number        // 0-4
  label: string
  color: string
  checks: {
    length: boolean        // min 8 chars
    uppercase: boolean     // at least one uppercase
    lowercase: boolean     // at least one lowercase
    number: boolean        // at least one number
    special: boolean       // at least one special char
  }
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      level: "empty",
      score: 0,
      label: "",
      color: "transparent",
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    }
  }

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length

  const levels: Record<number, { level: StrengthLevel; label: string; color: string }> = {
    0: { level: "weak", label: "Too short", color: "#EF4444" },
    1: { level: "weak", label: "Weak", color: "#EF4444" },
    2: { level: "fair", label: "Fair", color: "#F59E0B" },
    3: { level: "strong", label: "Strong", color: "#10B981" },
    4: { level: "strong", label: "Strong", color: "#10B981" },
    5: { level: "very_strong", label: "Very Strong", color: "#6C63FF" },
  }

  return {
    ...levels[score],
    score,
    checks,
  }
}





