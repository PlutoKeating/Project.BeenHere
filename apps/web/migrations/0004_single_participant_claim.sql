CREATE UNIQUE INDEX record_owners_single_claimed_idx
ON record_owners(record_id)
WHERE ownership_kind = 'claimed';
