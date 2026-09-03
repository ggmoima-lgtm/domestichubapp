create or replace function public.get_employer_unlocked_document_access(document uuid)
returns table (
  document_id uuid,
  bucket_id text,
  storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  document_row public.worker_documents%rowtype;
  has_access boolean := false;
begin
  if caller is null then
    raise exception 'Please sign in before viewing this document';
  end if;

  if document is null then
    raise exception 'Document is required';
  end if;

  select * into document_row from public.worker_documents where id = document;

  if document_row.id is null then
    raise exception 'Document not found';
  end if;

  if document_row.worker_profile_id = caller then
    has_access := true;
  end if;

  if not has_access then
    has_access := exists (
      select 1
      from public.profile_unlocks pu
      where pu.employer_id = caller
        and pu.helper_id = document_row.worker_profile_id
        and pu.expires_at > now()
    );
  end if;

  if not has_access then
    raise exception 'Private document access denied';
  end if;

  if coalesce(document_row.file_path, '') = '' then
    raise exception 'Document not found';
  end if;

  return query select document_row.id, 'worker-documents'::text, document_row.file_path;
end;
$$;

grant execute on function public.get_employer_unlocked_document_access(uuid) to authenticated;
revoke execute on function public.get_employer_unlocked_document_access(uuid) from anon;
revoke execute on function public.get_employer_unlocked_document_access(uuid) from public;