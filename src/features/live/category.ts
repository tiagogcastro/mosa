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
  if (/sport|esporte/i.test(name)) {
    return { name: 'Sports', Icon: Trophy };
  }
  if (/news|not[ií]cia|jornal/i.test(name)) {
    return { name: 'News', Icon: Newspaper };
  }
  if (/movie|cinema|filme/i.test(name)) {
    return { name: 'Movies', Icon: Clapperboard };
  }
  if (/series|s[eé]rie/i.test(name)) {
    return { name: 'Series', Icon: Film };
  }
  if (/kid|child|infantil|cartoon/i.test(name)) {
    return { name: 'Kids', Icon: Baby };
  }
  if (/music|m[uú]sica/i.test(name)) {
    return { name: 'Music', Icon: Music2 };
  }
  if (/document/i.test(name)) {
    return { name: 'Documentary', Icon: BookOpen };
  }
  if (/educat|escola/i.test(name)) {
    return { name: 'Education', Icon: GraduationCap };
  }
  if (/lifestyle|culin[aá]ria/i.test(name)) {
    return { name: 'Lifestyle', Icon: Coffee };
  }
  if (/entertain|varied|variedad/i.test(name)) {
    return { name: 'Entertainment', Icon: Sparkles };
  }
  if (/general/i.test(name)) {
    return { name: 'General', Icon: LayoutGrid };
  }
  return { name, Icon: Folder };
}
