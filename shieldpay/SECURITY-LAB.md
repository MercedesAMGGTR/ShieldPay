# ShieldPay security lab (Arko)

Map each **ARKO-LAB-xx** marker in the codebase to Arko findings, then remediate using Arko guidance only (per course policy).

| ID         | Topic (baseline)        | Student notes (what Arko highlighted) |
| ---------- | ----------------------- | ------------------------------------- |
| ARKO-LAB-01 | SQL injection           | |
| ARKO-LAB-02 | Broken access control   | |
| ARKO-LAB-03 | Admin role gate missing | |
| ARKO-LAB-04 | Sensitive fields in API | |
| ARKO-LAB-05 | Unsafe request logging  | |
| ARKO-LAB-06 | Error detail leakage    | |
| ARKO-LAB-07 | Weak JWT secret default | |
| ARKO-LAB-08 | Insecure reset / impersonation | |
| ARKO-LAB-09 | Plaintext PAN/CVV in DB | *Remediated:* AES-256-GCM at rest (`FIELD_ENCRYPTION_KEY`); see `backend/crypto/`. |

After fixes: note residual risk if any item is risk-accepted.
