import {
  Baby,
  BookOpen,
  Clapperboard,
  Coffee,
  Film,
  Folder,
  GraduationCap,
  LayoutGrid,
  Music2,
  Newspaper,
  Sparkles,
  Trophy,
} from 'lucide-react';

export function categoryPresentation(original: string) {
  const label =
    original
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)[0] || original;
  const name = /^undefined$|^other$|^unknown$/i.test(label) ? 'Other' : label;
  const concise = name.replace(/^(?:Filmes|Movies|Séries|Series)\s*[-|:]\s*/i, '').trim() || name;
  if (/sport|esporte/i.test(name)) {
    return { name: concise, Icon: Trophy };
  }
  if (/news|not[ií]cia|jornal/i.test(name)) {
    return { name: concise, Icon: Newspaper };
  }
  if (/movie|cinema|filme/i.test(name)) {
    return { name: concise, Icon: Clapperboard };
  }
  if (/series|s[eé]rie/i.test(name)) {
    return { name: concise, Icon: Film };
  }
  if (/kid|child|infantil|cartoon/i.test(name)) {
    return { name: concise, Icon: Baby };
  }
  if (/music|m[uú]sica/i.test(name)) {
    return { name: concise, Icon: Music2 };
  }
  if (/document/i.test(name)) {
    return { name: concise, Icon: BookOpen };
  }
  if (/educat|escola/i.test(name)) {
    return { name: concise, Icon: GraduationCap };
  }
  if (/lifestyle|culin[aá]ria/i.test(name)) {
    return { name: concise, Icon: Coffee };
  }
  if (/entertain|varied|variedad/i.test(name)) {
    return { name: concise, Icon: Sparkles };
  }
  if (/general/i.test(name)) {
    return { name: concise, Icon: LayoutGrid };
  }
  return { name: concise, Icon: Folder };
}
