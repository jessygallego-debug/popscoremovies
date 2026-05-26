"use client";

import {
  type KeyboardEvent,
  type RefObject,
  type TextareaHTMLAttributes,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MentionableUser } from "@/lib/mentions";

type MentionTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  mentionableUsers?: MentionableUser[];
  onChange: (value: string) => void;
  value: string;
};

type ActiveMention = {
  end: number;
  query: string;
  start: number;
};

function activeMentionForCursor(value: string, cursor: number): ActiveMention | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|[\s([{'"`])@([a-zA-Z0-9_]{0,24})$/);

  if (!match) {
    return null;
  }

  const query = match[2].toLowerCase();

  return {
    end: cursor,
    query,
    start: cursor - query.length - 1,
  };
}

export default function MentionTextarea({
  className = "",
  inputRef,
  mentionableUsers = [],
  onChange,
  onKeyDown,
  onSelect,
  value,
  ...textareaProps
}: MentionTextareaProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? localRef;
  const [selectionStart, setSelectionStart] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(
    null
  );
  const activeMention = useMemo(
    () => activeMentionForCursor(value, selectionStart),
    [selectionStart, value]
  );
  const activeMentionKey = activeMention
    ? `${activeMention.start}:${activeMention.query}`
    : null;
  const suggestions = useMemo(() => {
    if (!activeMention || textareaProps.disabled) {
      return [];
    }

    const query = activeMention.query;

    return mentionableUsers
      .filter((user) => {
        const username = user.username.toLowerCase();

        return !query || username.includes(query);
      })
      .sort((firstUser, secondUser) => {
        const firstUsername = firstUser.username.toLowerCase();
        const secondUsername = secondUser.username.toLowerCase();
        const firstStartsWithQuery = firstUsername.startsWith(query);
        const secondStartsWithQuery = secondUsername.startsWith(query);

        if (firstStartsWithQuery !== secondStartsWithQuery) {
          return firstStartsWithQuery ? -1 : 1;
        }

        return firstUsername.localeCompare(secondUsername);
      })
      .slice(0, 6);
  }, [activeMention, mentionableUsers, textareaProps.disabled]);
  const areSuggestionsOpen = Boolean(
    activeMentionKey &&
      activeMentionKey !== dismissedMentionKey &&
      suggestions.length > 0
  );
  const activeHighlightedIndex = suggestions.length
    ? Math.min(highlightedIndex, suggestions.length - 1)
    : 0;

  const updateSelectionStart = (target: HTMLTextAreaElement) => {
    setSelectionStart(target.selectionStart);
  };

  const selectMention = (user: MentionableUser) => {
    const latestMention = activeMentionForCursor(value, selectionStart);

    if (!latestMention) {
      return;
    }

    const nextValue = `${value.slice(0, latestMention.start)}@${
      user.username
    } ${value.slice(latestMention.end)}`;
    const nextCursor = latestMention.start + user.username.length + 2;

    onChange(nextValue);
    setDismissedMentionKey(null);
    setHighlightedIndex(0);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setSelectionStart(nextCursor);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (areSuggestionsOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((currentIndex) =>
          currentIndex + 1 >= suggestions.length ? 0 : currentIndex + 1
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((currentIndex) =>
          currentIndex - 1 < 0 ? suggestions.length - 1 : currentIndex - 1
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selectedUser = suggestions[activeHighlightedIndex];

        if (selectedUser) {
          selectMention(selectedUser);
        }

        return;
      }

      if (event.key === "Escape" && activeMentionKey) {
        event.preventDefault();
        setDismissedMentionKey(activeMentionKey);
        return;
      }
    }

    onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setDismissedMentionKey(null);
          setHighlightedIndex(0);
          updateSelectionStart(event.target);
        }}
        onClick={(event) => updateSelectionStart(event.currentTarget)}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => updateSelectionStart(event.currentTarget)}
        onSelect={(event) => {
          updateSelectionStart(event.currentTarget);
          onSelect?.(event);
        }}
        className={className}
      />
      {areSuggestionsOpen ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-1.5 shadow-2xl shadow-black/70">
          {suggestions.map((user, index) => (
            <button
              key={user.userId}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                selectMention(user);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                index === activeHighlightedIndex
                  ? "bg-yellow-400 text-black"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 text-sm font-black">
                {user.avatar}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">
                  @{user.username}
                </span>
                <span
                  className={`block truncate text-xs font-bold ${
                    index === activeHighlightedIndex
                      ? "text-black/65"
                      : "text-slate-500"
                  }`}
                >
                  {user.displayName}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
