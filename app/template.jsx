// A template re-mounts on every navigation (unlike the layout), so each page change fades in.
import FadeComponent from "@/components/FadeComponent";

export default function Template({ children }) {
	return <FadeComponent>{children}</FadeComponent>;
}
