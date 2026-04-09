import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";

export default function Home() {
  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
      />
    </Container>
  );
}
