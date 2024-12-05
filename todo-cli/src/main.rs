use clap::Parser;
use todo_cli;

#[derive(Parser, Debug)]
struct Cli {
    method: Option<String>,
    params: Option<Vec<String>>,
}

fn main() {
    let cli = Cli::parse();
    let mut todo_list = todo_cli::TodoList::new();
    let args = cli.params.unwrap_or(Vec::new());

    match cli.method {
        Some(method) => match method.as_str() {
            "list" => todo_list.list(),
            "add" => todo_list.add(&args),
            "rm" => todo_list.remove(args),
            "done" => todo_list.done(args),
            _ => todo_list.list(),
        },
        None => todo_list.list(),
    }
}
