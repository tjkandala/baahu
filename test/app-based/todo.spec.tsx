import { b, mount, machine, emit } from '../../src';
import { machineRegistry } from '../../src/machineRegistry';

describe('todo app', () => {
  let $root = document.body;

  test('works', () => {
    const List = machine<any, any, any, any>({
      id: 'list',
      context: () => ({
        todos: [],
        nextId: 0,
      }),
      initial: 'default',
      when: {
        default: {
          on: {
            NEW_TODO: {
              do: (ctx, e) =>
                ctx.todos.push({ todo: e.todo, key: ctx.nextId++ }),
            },
            DELETE_ITEM: {
              do: (ctx, e) =>
                (ctx.todos = ctx.todos.filter(
                  (todo: any) => todo.key !== e.key
                )),
            },
          },
        },
      },
      render: (_s, ctx, self) => (
        <div>
          <form
            onSubmit={e => {
              e.preventDefault();
              const todoInput = e.currentTarget.todo;
              emit({ type: 'NEW_TODO', todo: todoInput.value }, self);
              todoInput.value = '';
            }}
          >
            <input name="todo" type="text" />
          </form>
          <div>
            {ctx.todos.map((todo: any) => (
              <Item todo={todo} key={todo.key} />
            ))}
          </div>
        </div>
      ),
    });
    const Item = machine<{ todo: { todo: string; key: number } }>({
      id: ({ todo }) => `todo-${todo.key}`,
      context: ({ todo }) => ({ todo: todo }),
      initial: 'default',
      when: {
        default: {
          on: {},
        },
      },
      render: (_s, ctx) => (
        <div>
          <p>{ctx.todo.todo}</p>
          <button
            onClick={() =>
              emit({ type: 'DELETE_ITEM', key: ctx.todo.key }, 'list')
            }
          >
            delete me
          </button>
        </div>
      ),
    });

    $root = mount(List, $root);

    const $list = $root.childNodes[1];

    expect($list?.childNodes.length).toBe(0);

    // key will be 0
    emit({ type: 'NEW_TODO', todo: 'first' }, 'list');

    expect($list?.childNodes.length).toBe(1);

    expect($list.firstChild?.firstChild?.firstChild?.nodeValue).toBe('first');

    // key will be 1
    emit({ type: 'NEW_TODO', todo: 'second' }, 'list');

    expect($list?.childNodes.length).toBe(2);

    // key will be 2
    emit({ type: 'NEW_TODO', todo: 'third' }, 'list');

    // three items, one list
    expect(machineRegistry.size).toBe(4);

    expect($list?.childNodes.length).toBe(3);

    // delete second item/key 1
    emit({ type: 'DELETE_ITEM', key: 1 });

    // two items, one list
    expect(machineRegistry.size).toBe(3);

    expect($list?.childNodes.length).toBe(2);

    // delete first item/key 0
    emit({ type: 'DELETE_ITEM', key: 0 });

    // one item, one list
    expect(machineRegistry.size).toBe(2);

    expect($list?.childNodes.length).toBe(1);

    expect($list.firstChild?.firstChild?.firstChild?.nodeValue).toBe('third');

    // delete third item/key 2
    emit({ type: 'DELETE_ITEM', key: 2 });

    // no items, one list
    expect(machineRegistry.size).toBe(1);

    expect($list?.childNodes.length).toBe(0);
  });
});
