# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- When diagnosing issues, explain the root cause and analysis before proposing or implementing changes. Confidence: 0.70
- When fixing one instance of misleading or hardcoded prototype data, proactively find and fix all similar instances across the codebase instead of only the one pointed out. Confidence: 0.70

# architecture
- BDSP actors are normal BDSPs with is_platform=false; the V4V_ADMIN role holds is_platform=true, can enroll farmers, and has oversight of all BDSPs and their network members. Self-registered SHFs default under the V4V admin's network. Confidence: 0.85

# ui
- All commodity measures in post listing forms should use kilograms (kg). Confidence: 0.70

# backend
- PostgreSQL bigint columns come through node-postgres as strings; use String() comparison rather than parseInt() when filtering by bdsp_id or similar bigint fields. Confidence: 0.70

