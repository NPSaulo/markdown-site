import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import PostList from "../components/PostList";

// src/pages/Home.tsx

const siteConfig = {
  name: 'Blog do Saulo', // Título alterado
  title: "Real-time Site with Convex",
  logo: "/images/logo.svg" as string | null,
  intro: (
    <>
      Este é meu blog pessoal. 
    </>
  ),
  bio: `Aqui compartilharei textos, projetos, acontecimentos e sei lá mais o quê.`,
  featuredEssays: [],
  links: {
    repoOriginal: "https://github.com/waynesutton/markdown-site",
    },
};

export default function Home() {
  const posts = useQuery(api.posts.getAllPosts);

  return (
    <div className="home">
      <header className="home-header">
        {siteConfig.logo && (
          <img
            src={siteConfig.logo}
            alt={siteConfig.name}
            className="home-logo"
          />
        )}
        <h1 className="home-name">{siteConfig.name}</h1>
        <p className="home-intro">{siteConfig.intro}</p>
        <p className="home-bio">{siteConfig.bio}</p>

        {}
        {siteConfig.featuredEssays.length > 0 && (
          <div className="home-featured">
            <p className="home-featured-intro">Get started:</p>
            <ul className="home-featured-list">
              {siteConfig.featuredEssays.map((essay) => (
                <li key={essay.slug}>
                  <a href={`/${essay.slug}`} className="home-featured-link">
                    {essay.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <section id="posts" className="home-posts">
        {posts === undefined ? null : posts.length === 0 ? (
          <p className="no-posts">Ainda não há posts por aqui.</p>
        ) : (
          <PostList posts={posts} />
        )}
      </section>

      <footer className="home-footer">
        <p className="home-footer-text">
          Copiado {" "}
          <a href={siteConfig.links.repoOriginal} target="_blank" rel="noopener noreferrer">
            daqui. 
          </a>{" "} Todos créditos ao autor.
        </p>
      </footer>
    </div>
  );
}
