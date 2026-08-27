import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const forms = await readFile(new URL('../js/forms_unified.jsx', import.meta.url), 'utf8');
const resources = await readFile(new URL('../js/api/resources.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-workflow.css', import.meta.url), 'utf8');

function loadIntakeHelpers() {
  const names = ['ufDateFromRecognized', 'ufApplyRecognizedFields'];
  const sources = names.map((name) => {
    const from = forms.indexOf(`function ${name}(`);
    const to = forms.indexOf('\n}', from);
    assert.ok(from >= 0 && to > from, `helper ${name} must exist`);
    return forms.slice(from, to + 2);
  });
  const docTypes = forms.slice(forms.indexOf('const UF_DOC_TYPES'), forms.indexOf('\n', forms.indexOf('const UF_DOC_TYPES')));
  const citizenship = forms.slice(forms.indexOf('const UF_CITIZENSHIP'), forms.indexOf('\n', forms.indexOf('const UF_CITIZENSHIP')));
  const labels = forms.slice(forms.indexOf('const UF_INTAKE_DOC_LABELS'), forms.indexOf('\n};', forms.indexOf('const UF_INTAKE_DOC_LABELS')) + 3);
  return Function(`${docTypes}\n${citizenship}\n${labels}\n${sources.join('\n')}\nreturn { ${names.join(', ')} };`)();
}

test('document recognition is offered as an alternative at the top of the form', () => {
  assert.match(forms, /function UnifiedPersonIntake\(/);
  assert.match(forms, /Заполнить по документу/);
  assert.match(forms, /Заполнить вручную/);
  // Блок стоит первым в анкете, а не в конце.
  assert.match(forms, /return \(\n    <>\n      \{intake\}\n      <PanelSub style=\{\{ marginTop: 0 \}\}>Личные данные<\/PanelSub>/);
  // Для новой карточки распознавание предлагается сразу.
  assert.match(forms, /const \[intakeMode, setIntakeMode\] = useState\(mode === 'edit' \? 'manual' : 'ocr'\)/);
  assert.match(styles, /\.uf-intake \{/);
});

test('recognition goes to the backend and no longer fabricates a number', () => {
  assert.match(resources, /recognizePersonDocument: \(file\) => \{/);
  assert.match(resources, /person-documents\/recognize\//);
  assert.match(forms, /await crmApi\.recognizePersonDocument\(file\)/);
  // Старый мок с random-номером паспорта убран.
  assert.doesNotMatch(forms, /'AC ' \+ \(1000000 \+ Math\.floor\(Math\.random\(\)/);
  assert.doesNotMatch(forms, /file: 'passport_scan\.jpg'/);
});

test('recognized fields fill the card without overwriting operator input', () => {
  const { ufApplyRecognizedFields, ufDateFromRecognized } = loadIntakeHelpers();

  assert.equal(ufDateFromRecognized('1974-08-12'), '12.08.1974');
  assert.equal(ufDateFromRecognized(''), '');

  const blank = {
    lastName: '', firstName: '', middleName: '', dob: '', gender: '',
    citizenship: 'Кыргызстан', docType: 'Загранпаспорт', docNo: '', docExpiry: '', documents: [],
  };
  const filled = ufApplyRecognizedFields(blank, {
    surname: 'ERIKSSON', given_name: 'ANNA', middle_name: 'MARIA',
    latin_surname: 'ERIKSSON', latin_given_name: 'ANNA', latin_middle_name: 'MARIA',
    birth_date: '1974-08-12', sex: 'Женский', number: 'L898902C3',
    expiry_date: '2032-04-15', document_label: 'Загранпаспорт', citizenship: 'Германия',
    file_name: 'passport.jpg',
  });

  assert.equal(filled.lastName, 'ERIKSSON');
  assert.equal(filled.firstName, 'ANNA');
  assert.equal(filled.dob, '12.08.1974');
  assert.equal(filled.gender, 'Женский');
  assert.equal(filled.docNo, 'L898902C3');
  assert.equal(filled.docExpiry, '15.04.2032');
  assert.equal(filled.citizenship, 'Германия');
  // Документ попадает в список документов персоны одной строкой.
  assert.equal(filled.documents.length, 1);
  assert.equal(filled.documents[0].docNo, 'L898902C3');
  assert.equal(filled.documents[0].latLast, 'ERIKSSON');
  assert.equal(filled.documents[0].file, 'passport.jpg');

  // Повторное распознавание того же документа не плодит дубли и не затирает
  // то, что оператор уже поправил руками.
  const edited = { ...filled, firstName: 'Анна' };
  const again = ufApplyRecognizedFields(edited, {
    surname: 'ERIKSSON', given_name: 'ANNA', number: 'L898902C3', birth_date: '1974-08-12',
  });
  assert.equal(again.firstName, 'Анна');
  assert.equal(again.documents.length, 1);
});

test('an unknown citizenship or document type does not corrupt the card', () => {
  const { ufApplyRecognizedFields } = loadIntakeHelpers();
  const filled = ufApplyRecognizedFields(
    { citizenship: 'Кыргызстан', docType: 'Загранпаспорт', documents: [] },
    { citizenship: 'Уругвай', document_label: 'Служебный паспорт', number: 'X1' },
  );
  assert.equal(filled.citizenship, 'Кыргызстан');
  assert.equal(filled.docType, 'Загранпаспорт');
});
