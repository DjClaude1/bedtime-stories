'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Save, Edit3 } from 'lucide-react';
import type { Child, Plan } from '@/lib/types';

export function ChildrenManager({
  initial,
  maxChildren,
  plan,
}: {
  initial: Child[];
  maxChildren: number;
  plan: Plan;
}) {
  const [children, setChildren] = useState<Child[]>(initial);
  const [draftName, setDraftName] = useState('');
  const [draftAge, setDraftAge] = useState<number | ''>('');
  const [draftInterests, setDraftInterests] = useState('');
  const [draftChars, setDraftChars] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = maxChildren !== -1 && children.length >= maxChildren;

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName.trim(),
          age: draftAge === '' ? undefined : Number(draftAge),
          preferences: {
            interests: splitList(draftInterests),
            favoriteCharacters: splitList(draftChars),
            notes: draftNotes.trim() || undefined,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to add');
      setChildren([...children, data.child]);
      setDraftName(''); setDraftAge(''); setDraftInterests(''); setDraftChars(''); setDraftNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeChild(id: string) {
    if (!confirm('Remove this child profile and all their stories?')) return;
    await fetch(`/api/children/${id}`, { method: 'DELETE' });
    setChildren(children.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      {children.length > 0 && (
        <ul className="space-y-3">
          {children.map((c) => (
            <ChildRow key={c.id} child={c} onDelete={() => removeChild(c.id)} onUpdate={(u) => {
              setChildren(children.map((x) => (x.id === c.id ? u : x)));
            }} />
          ))}
        </ul>
      )}

      {atLimit ? (
        <div className="card">
          <p className="text-night-200/80 text-sm mb-2">
            Your <span className="text-night-300">{plan}</span> plan allows{' '}
            {maxChildren} {maxChildren === 1 ? 'child profile' : 'child profiles'}.
          </p>
          <Link href="/pricing" className="underline text-sm">Upgrade to add more</Link>
        </div>
      ) : (
        <form onSubmit={addChild} className="card space-y-3">
          <h2 className="font-serif text-lg">Add a little one</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label>Name</label>
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Maya" required />
            </div>
            <div>
              <label>Age</label>
              <input
                type="number" min={1} max={14}
                value={draftAge}
                onChange={(e) => setDraftAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label>Interests (comma-separated)</label>
            <input value={draftInterests} onChange={(e) => setDraftInterests(e.target.value)} placeholder="bunnies, space, painting" />
          </div>
          <div>
            <label>Favorite characters</label>
            <input value={draftChars} onChange={(e) => setDraftChars(e.target.value)} placeholder="Luna the bunny, Grandma" />
          </div>
          <div>
            <label>Notes for the storyteller</label>
            <textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} rows={2} placeholder="Anything tender to include or avoid" />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add child'}
          </button>
        </form>
      )}
    </div>
  );
}

function ChildRow({
  child,
  onDelete,
  onUpdate,
}: {
  child: Child;
  onDelete: () => void;
  onUpdate: (c: Child) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState<number | ''>(child.age ?? '');
  const [interests, setInterests] = useState((child.preferences?.interests ?? []).join(', '));
  const [chars, setChars] = useState((child.preferences?.favoriteCharacters ?? []).join(', '));
  const [notes, setNotes] = useState(child.preferences?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const resp = await fetch(`/api/children/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        age: age === '' ? null : Number(age),
        preferences: {
          interests: splitList(interests),
          favoriteCharacters: splitList(chars),
          notes: notes.trim() || undefined,
        },
      }),
    });
    const data = await resp.json();
    setSaving(false);
    if (resp.ok) {
      onUpdate(data.child);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <li className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-serif text-lg">{child.name}{child.age ? ` · age ${child.age}` : ''}</div>
            {(child.preferences?.interests?.length ?? 0) > 0 && (
              <div className="text-xs text-night-300/80 mt-1">
                Likes: {child.preferences!.interests!.join(', ')}
              </div>
            )}
            {(child.preferences?.favoriteCharacters?.length ?? 0) > 0 && (
              <div className="text-xs text-night-300/80 mt-0.5">
                Friends: {child.preferences!.favoriteCharacters!.join(', ')}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost !py-1.5 !px-2.5" onClick={() => setEditing(true)} aria-label="Edit">
              <Edit3 className="w-4 h-4" />
            </button>
            <button className="btn-ghost !py-1.5 !px-2.5" onClick={onDelete} aria-label="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="card space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Age</label>
          <input
            type="number" min={1} max={14}
            value={age}
            onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>
      <div><label>Interests</label><input value={interests} onChange={(e) => setInterests(e.target.value)} /></div>
      <div><label>Favorite characters</label><input value={chars} onChange={(e) => setChars(e.target.value)} /></div>
      <div><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
      </div>
    </li>
  );
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 10);
}
