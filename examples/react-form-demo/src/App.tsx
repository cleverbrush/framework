import { BasicContactForm } from './examples/BasicContactForm';
import { ValidationShowcaseForm } from './examples/ValidationShowcaseForm';
import { NestedObjectForm } from './examples/NestedObjectForm';
import { HeadlessForm } from './examples/HeadlessForm';
import { AdvancedFeaturesForm } from './examples/AdvancedFeaturesForm';

function App() {
    return (
        <div className="app">
            <header>
                <h1>@cleverbrush/react-form — Examples</h1>
                <p>
                    A headless, schema-driven form system for React built on{' '}
                    <code>@cleverbrush/schema</code> PropertyDescriptors.
                </p>
            </header>

            <main>
                <BasicContactForm />
                <ValidationShowcaseForm />
                <NestedObjectForm />
                <HeadlessForm />
                <AdvancedFeaturesForm />
            </main>

            <footer>
                <p>
                    Source:{' '}
                    <a
                        href="https://github.com/cleverbrush/framework/tree/master/libs/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>
                </p>
            </footer>
        </div>
    );
}

export default App;
